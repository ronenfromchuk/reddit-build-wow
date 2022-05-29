import { useSession } from 'next-auth/react';
import React, { useState } from 'react';
import Avatar from './Avatar';
import { LinkIcon, PhotographIcon } from '@heroicons/react/outline';
import { useForm } from 'react-hook-form';
import { ADD_POST, ADD_SUBREDDIT } from '../graphql/mutations';
import { useMutation } from '@apollo/client';
import client from '../apollo-client';
import { GET_ALL_POSTS, GET_SUBREDDIT_BY_TOPIC } from '../graphql/queries';
import toast from 'react-hot-toast';

type FormData = {
  postTitle: string
  postBody: string
  postImage: string
  subreddit: string
}

type Props = {
  subreddit?: string
}

function PostBox({ subreddit}: Props) {
    const { data: session } = useSession()
    const [addPost] = useMutation(ADD_POST, {
      refetchQueries: [GET_ALL_POSTS,'getPostList'],
    })
    const [addSubreddit] = useMutation(ADD_SUBREDDIT)

    const [imageBoxOpen, setimageBoxOpen] = useState<boolean>(false)
    const {
      register,
      setValue,
      handleSubmit,
      watch,
      formState: { errors },
    } = useForm<FormData>()

    const onSubmit = handleSubmit(async (formData) => {
      console.log(formData)
      const notification = toast.loading('Creating new post...')

      try {
        // Query for the subreddit topic...
        const {
          data: { getSubredditListByTopic },
      } = await client.query({
            query: GET_SUBREDDIT_BY_TOPIC,
            variables: { 
              topic: subreddit || formData.subreddit,
            }
        })

        const subredditExists = getSubredditListByTopic.length > 0;

        if (!subredditExists) {
          // create subreddit...
          console.log('Subreddit is new! ---> creating a NEW subreddit!')
          
          const { data: { insertSubreddit: newSubreddit }} = await addSubreddit({
            variables: {
              topic: formData.subreddit,
            },
          })

          console.log('Creating post...', formData)
          const image = formData.postImage || ''

          const {
          data: { insterPost: newPost },
        } = await addPost({
            variables: {
              body: formData.postBody,
              image: image,
              subreddit_id: newSubreddit.id,
              title: formData.postTitle,
              username: session?.user?.name,
            },
          })

            console.log('New post added:', newPost)
          } else {
            // use existing subreddit
            console.log('Using existing subreddit!')
            console.log(getSubredditListByTopic)
    
            const image = formData.postImage || ''
    
            const {
              data: { insertPost: newPost },
            } = await addPost({
              variables: {
                body: formData.postBody,
                image: image,
                subreddit_id: getSubredditListByTopic[0].id,
                title: formData.postTitle,
                username: session?.user?.name,            
              },
            })
            console.log('New Post was added:', newPost)
          }

          // After the post has been added
          setValue('postBody', '')
          setValue('postImage', '')
          setValue('postTitle', '')
          setValue('subreddit', '')

          toast.success('New Post Created!', {
            id: notification,
          })
      } catch (error) {
        toast.error('Whoops something went wrong!',{
          id: notification,
        })
      }
    })

  return (
    <form 
      onSubmit={onSubmit} 
      className="sticky top-20 z-50 bg-white border 
      rounded-md border-gray-300 p-2"
    >
        <div className="flex items-center space-x-3">
            <Avatar />

            <input 
              {...register('postTitle', { required: true })}
              disabled={!session}
              className="rounded-md flex-1 bg-gray-50 p-2 pl-5 outline-none"
              type="text" 
              placeholder={session ? subreddit ? `Create a post /r${subreddit}` : "Create a post by entering a title!" : "Sign in to post"} 
            />

            <PhotographIcon onClick={() => setimageBoxOpen(!imageBoxOpen)} className={`h-6 text-gray-300 cursor-pointer ${imageBoxOpen && 'text-blue-300'}`} />
            <LinkIcon className={`h-6 text-gray-300`} />
        </div>

        {!!watch('postTitle') && (
          <div className="flex flex-col py-2">
              {/* Body */}
              <div className="flex items-center px-2">
                <p className="min-w-[90px]">Body:</p>
                <input
                  className="m-2 flex-1 bg-blue-50 p-2 outline-none"
                  {...register('postBody')}
                  type="text" 
                  placeholder="Text (optional)" 
                />
              </div>

              {!subreddit && (
                <div className="flex items-center px-2">
                  <p className="min-w-[90px]">Subreddit:</p>
                  <input
                    className="m-2 flex-1 bg-blue-50 p-2 outline-none"
                    {...register('subreddit', { required: true })}
                    type="text" 
                    placeholder="i.e reactjs" 
                  />
                </div>                
              )}

              {imageBoxOpen && (
                <div className="flex items-center px-2">
                  <p className="min-w-[90px]">Image URL:</p>
                  <input
                    className="m-2 flex-1 bg-blue-50 p-2 outline-none"
                    {...register('postImage')}
                    type="text" 
                    placeholder="Optional" 
                  />
                </div>
              )}

              {/* Errors */}
              {Object.keys(errors).length > 0 && (
                <div className="space-y-2 text-red-500">
                  {errors.postTitle?.type === 'required' && (
                    <p>🔴 A post Title is required</p>
                  )}

                  {errors.subreddit?.type === 'required' && (
                    <p>🔴 A Subreddit is required</p>
                  )}  
                </div>
              )}

              {!!watch('postTitle') && 
              <button 
                type="submit" 
                className="w-full rounded-full
              bg-blue-400 p-2 text-white">
                Create Post
              </button>}
          </div>
        )}
    </form>
  )
}

export default PostBox;